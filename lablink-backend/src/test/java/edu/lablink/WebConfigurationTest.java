package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.filter.CorsFilter;

class WebConfigurationTest {
    @Test
    void apiPreflightIncludesTheFrontendOrigin() throws Exception {
        WebConfiguration configuration = new WebConfiguration();
        ReflectionTestUtils.setField(configuration, "frontendOrigin", "http://localhost:5173");
        CorsFilter filter = configuration.corsFilter().getFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/users/register");
        request.addHeader("Origin", "http://localhost:5173");
        request.addHeader("Access-Control-Request-Method", "POST");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
        assertEquals("http://localhost:5173", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("GET,POST,PUT,PATCH,DELETE,OPTIONS", response.getHeader("Access-Control-Allow-Methods"));
    }
}
