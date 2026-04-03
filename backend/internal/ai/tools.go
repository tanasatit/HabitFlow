package ai

const (
	ToolGetUserHabits = "get_user_habits"
	ToolGetUserStats  = "get_user_stats"
	ToolGetCalendar   = "get_calendar_events"
	ToolWriteCalendar = "write_calendar_events"
)

func GetToolDefinitions() []ToolDef {
	return []ToolDef{
		{
			FunctionDeclarations: []FunctionDecl{
				{
					Name:        ToolGetUserHabits,
					Description: "Get the user's active habits list",
				},
				{
					Name:        ToolGetUserStats,
					Description: "Get the user's current stats including streak and completion rate",
				},
				{
					Name:        ToolGetCalendar,
					Description: "Get existing calendar events for a date range",
					Parameters: &ParamSpec{
						Type: "OBJECT",
						Properties: map[string]ParamProp{
							"start_date": {Type: "STRING", Description: "Start date in YYYY-MM-DD format"},
							"end_date":   {Type: "STRING", Description: "End date in YYYY-MM-DD format"},
						},
						Required: []string{"start_date", "end_date"},
					},
				},
				{
					Name:        ToolWriteCalendar,
					Description: "Write habit events to the user's calendar. Call this after the user approves the plan.",
					Parameters: &ParamSpec{
						Type: "OBJECT",
						Properties: map[string]ParamProp{
							"events": {
								Type:        "ARRAY",
								Description: "Array of calendar events to create",
								Items: &ParamSpec{
									Type: "OBJECT",
									Properties: map[string]ParamProp{
										"title":            {Type: "STRING", Description: "Event title"},
										"scheduled_date":   {Type: "STRING", Description: "Date in YYYY-MM-DD format"},
										"start_time":       {Type: "STRING", Description: "Time in HH:MM format"},
										"duration_minutes": {Type: "INTEGER", Description: "Duration in minutes"},
										"habit_id":         {Type: "STRING", Description: "Optional habit UUID"},
									},
									Required: []string{"title", "scheduled_date", "start_time", "duration_minutes"},
								},
							},
						},
						Required: []string{"events"},
					},
				},
			},
		},
	}
}
