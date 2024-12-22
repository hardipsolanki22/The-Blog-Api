class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something want to wraong",
        errors = []
    ) {
        super(message)
        this.statusCode = statusCode,
        this.errors = errors,
        this.message = message
        this.data = null,
        this.success = false
        
    }
}

export {ApiError}