package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	geminiKey       string
	geminiModel     string
	openRouterKey   string
	openRouterModel string
	httpClient      *http.Client
}

func NewClient(geminiKey, geminiModel, openRouterKey, openRouterModel string) *Client {
	return &Client{
		geminiKey:       geminiKey,
		geminiModel:     geminiModel,
		openRouterKey:   openRouterKey,
		openRouterModel: openRouterModel,
		httpClient:      &http.Client{Timeout: 120 * time.Second},
	}
}

// --- Types ---

type ChatRequest struct {
	Messages []Message `json:"messages"`
	Tools    []ToolDef `json:"tools,omitempty"`
}

type Message struct {
	Role           string          `json:"role"`
	Content        string          `json:"content,omitempty"`
	FunctionCall   *FunctionCall   `json:"functionCall,omitempty"`
	FunctionResult *FunctionResult `json:"functionResponse,omitempty"`
}

type FunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args"`
}

type FunctionResult struct {
	Name     string `json:"name"`
	Response string `json:"response"`
}

type ToolDef struct {
	FunctionDeclarations []FunctionDecl `json:"functionDeclarations"`
}

type FunctionDecl struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Parameters  *ParamSpec `json:"parameters,omitempty"`
}

type ParamSpec struct {
	Type       string               `json:"type"`
	Properties map[string]ParamProp `json:"properties,omitempty"`
	Required   []string             `json:"required,omitempty"`
}

type ParamProp struct {
	Type        string               `json:"type"`
	Description string               `json:"description,omitempty"`
	Items       *ParamSpec           `json:"items,omitempty"`
	Properties  map[string]ParamProp `json:"properties,omitempty"`
}

type StreamChunk struct {
	Text  string
	Tool  *FunctionCall
	Done  bool
	Error error
}

type ChatResponse struct {
	FullText      string
	FunctionCalls []FunctionCall
}

// StreamChat sends to Gemini (or OpenRouter fallback) and streams chunks back via ch.
func (c *Client) StreamChat(ctx context.Context, req ChatRequest, ch chan<- StreamChunk) (*ChatResponse, error) {
	if c.geminiKey != "" {
		resp, err := c.streamGemini(ctx, req, ch)
		if err == nil {
			return resp, nil
		}
		if c.openRouterKey != "" {
			return c.streamOpenRouter(ctx, req, ch)
		}
		return nil, err
	}
	if c.openRouterKey != "" {
		return c.streamOpenRouter(ctx, req, ch)
	}
	return nil, fmt.Errorf("no AI API key configured")
}

// --- Gemini implementation ---

type geminiPart struct {
	Text             string          `json:"text,omitempty"`
	FunctionCall     *FunctionCall   `json:"functionCall,omitempty"`
	FunctionResponse *funcRespPart   `json:"functionResponse,omitempty"`
}

type funcRespPart struct {
	Name     string         `json:"name"`
	Response map[string]any `json:"response"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type geminiBody struct {
	SystemInstruction *geminiSystemInstruction `json:"system_instruction,omitempty"`
	Contents          []geminiContent          `json:"contents"`
	Tools             []ToolDef                `json:"tools,omitempty"`
	ToolConfig map[string]any `json:"toolConfig,omitempty"`
}

func (c *Client) streamGemini(ctx context.Context, req ChatRequest, ch chan<- StreamChunk) (*ChatResponse, error) {
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse&key=%s",
		c.geminiModel, c.geminiKey,
	)

	var contents []geminiContent
	var sysInstruction *geminiSystemInstruction

	for _, m := range req.Messages {
		if m.Role == "system" {
			sysInstruction = &geminiSystemInstruction{
				Parts: []geminiPart{{Text: m.Content}},
			}
			continue
		}
		role := m.Role
		if role == "assistant" {
			role = "model"
		}
		var parts []geminiPart
		switch {
		case m.FunctionResult != nil:
			role = "user" // Gemini requires "user" role for function responses
			parts = []geminiPart{{
				FunctionResponse: &funcRespPart{
					Name:     m.FunctionResult.Name,
					Response: map[string]any{"content": m.FunctionResult.Response},
				},
			}}
		case m.FunctionCall != nil:
			parts = []geminiPart{{FunctionCall: m.FunctionCall}}
		default:
			parts = []geminiPart{{Text: m.Content}}
		}
		contents = append(contents, geminiContent{Role: role, Parts: parts})
	}

	body := geminiBody{
		SystemInstruction: sysInstruction,
		Contents:          contents,
		Tools:             req.Tools,
		ToolConfig: map[string]any{"functionCallingConfig": map[string]any{"mode": "AUTO"}},
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal gemini request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("create gemini request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini request: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode >= 400 {
		b, _ := io.ReadAll(httpResp.Body)
		return nil, fmt.Errorf("gemini error %d: %s", httpResp.StatusCode, string(b))
	}

	result := &ChatResponse{}
	scanner := bufio.NewScanner(httpResp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var chunk map[string]interface{}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		candidates, _ := chunk["candidates"].([]interface{})
		if len(candidates) == 0 {
			continue
		}
		candidate, _ := candidates[0].(map[string]interface{})
		content, _ := candidate["content"].(map[string]interface{})
		parts, _ := content["parts"].([]interface{})

		for _, p := range parts {
			part, _ := p.(map[string]interface{})
			if text, ok := part["text"].(string); ok && text != "" {
				result.FullText += text
				select {
				case ch <- StreamChunk{Text: text}:
				case <-ctx.Done():
					return result, ctx.Err()
				}
			}
			if fc, ok := part["functionCall"].(map[string]interface{}); ok {
				name, _ := fc["name"].(string)
				args, _ := fc["args"].(map[string]interface{})
				if args == nil {
					args = map[string]interface{}{}
				}
				call := &FunctionCall{Name: name, Args: args}
				result.FunctionCalls = append(result.FunctionCalls, *call)
				select {
				case ch <- StreamChunk{Tool: call}:
				case <-ctx.Done():
					return result, ctx.Err()
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("gemini stream read: %w", err)
	}

	return result, nil
}

// --- OpenRouter fallback ---

func (c *Client) streamOpenRouter(ctx context.Context, req ChatRequest, ch chan<- StreamChunk) (*ChatResponse, error) {
	type orMessage struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type orBody struct {
		Model    string      `json:"model"`
		Messages []orMessage `json:"messages"`
		Stream   bool        `json:"stream"`
	}

	var msgs []orMessage
	for _, m := range req.Messages {
		content := m.Content
		if m.FunctionResult != nil {
			content = m.FunctionResult.Response
		}
		role := m.Role
		if role == "function" {
			role = "user"
		}
		msgs = append(msgs, orMessage{Role: role, Content: content})
	}

	body := orBody{Model: c.openRouterModel, Messages: msgs, Stream: true}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal openrouter request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.openRouterKey)

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("openrouter request: %w", err)
	}
	defer httpResp.Body.Close()

	result := &ChatResponse{}
	scanner := bufio.NewScanner(httpResp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}
		var chunk map[string]interface{}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		choices, _ := chunk["choices"].([]interface{})
		if len(choices) == 0 {
			continue
		}
		delta, _ := choices[0].(map[string]interface{})["delta"].(map[string]interface{})
		if text, ok := delta["content"].(string); ok && text != "" {
			result.FullText += text
			select {
			case ch <- StreamChunk{Text: text}:
			case <-ctx.Done():
				return result, ctx.Err()
			}
		}
	}

	return result, scanner.Err()
}
