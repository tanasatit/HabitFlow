interface HeroGreetingProps {
  name: string | null
  subtitle?: string
}

export function HeroGreeting({ name, subtitle }: HeroGreetingProps) {
  return (
    <header className="mb-8">
      <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-background leading-tight">
        Welcome back,{' '}
        {name ? (
          <span className="text-primary">{name}</span>
        ) : (
          <span className="text-primary">there</span>
        )}
        !
      </h1>
      {subtitle && (
        <p className="mt-2 text-on-surface-variant text-sm">{subtitle}</p>
      )}
    </header>
  )
}
