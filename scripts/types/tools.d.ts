export type StringValues<T> = {
    [K in keyof T]: string
}

type RequiredNotNull<T> = {
    [P in keyof T]: NonNullable<T[P]>
}

export type PickNonNullable<T, K extends keyof T> = T & RequiredNotNull<Pick<T, K>>
