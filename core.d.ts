// Core API types for Seanime extensions

declare function fetch(url: string, options?: {
    method?: string
    headers?: { [key: string]: string }
    body?: string
}): Promise<{
    ok: boolean
    status: number
    text(): Promise<string>
    json(): Promise<any>
    url: string
}>

declare function LoadDoc(html: string): any

declare const console: {
    log(...args: any[]): void
    error(...args: any[]): void
    warn(...args: any[]): void
    info(...args: any[]): void
}

declare function $sleep(ms: number): Promise<void>
