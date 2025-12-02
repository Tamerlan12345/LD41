# Use an image with Haxe and Lime pre-installed
FROM haxe:4.3-alpine AS builder

# Install git (required for haxelib git)
RUN apk add --no-cache git

# Install dependencies
RUN haxelib install flixel
RUN haxelib install lime
RUN haxelib install openfl
RUN haxelib git zerolib https://github.com/01010111/zerolib.git

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Build the game for HTML5
RUN haxelib run lime build html5

# Final stage: Serve the game
FROM python:3.9-alpine

WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder /app/export/html5/bin /app

# Expose the port (Railway uses PORT env var, but defaults to 8080 or similar)
ENV PORT=8080

# Command to run a simple HTTP server
CMD python3 -m http.server $PORT
