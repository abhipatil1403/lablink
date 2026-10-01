package edu.lablink;

import java.util.Map;
import org.slf4j.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrorHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException error) { return body(error.status(), error.getMessage()); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
                       IllegalArgumentException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception error) { return body(HttpStatus.BAD_REQUEST, "Check the submitted fields"); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict() { return body(HttpStatus.CONFLICT, "A record already exists or conflicts with related records"); }
    @ExceptionHandler(org.springframework.web.context.request.async.AsyncRequestNotUsableException.class)
    void disconnected() { log.debug("Client disconnected before the response completed"); }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<?> missing() { return body(HttpStatus.NOT_FOUND, "Endpoint not found"); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception error) {
        log.error("API request failed", error);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to complete this request");
    }
    private ResponseEntity<?> body(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message, "status", status.value()));
    }
}
