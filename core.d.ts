declare function fetch(url: string, options?: {
    method?: string
    headers?: { [key: string]: string }
    body?: string
}): Promise<{
    ok: boolean
    status: number
    statusText: string
    text(): Promise<string>
    json(): Promise<any>
    url: string
}>

declare const console: {
    log(...args: any[]): void
    error(...args: any[]): void
    warn(...args: any[]): void
    info(...args: any[]): void
}
