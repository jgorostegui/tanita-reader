# Tanita Reader — development tasks

# List all recipes
default:
    @just --list

# Install dependencies
install:
    npm install

# Run unit tests
test:
    node --test 'test/**/*.test.js'

# Run all linters
lint: lint-js lint-css

# Lint JavaScript (ESLint)
lint-js:
    npx eslint js/

# Lint CSS (Stylelint)
lint-css:
    npx stylelint css/

# Fix all auto-fixable lint issues
fix: fix-js fix-css

# Fix JavaScript lint issues
fix-js:
    npx eslint js/ --fix

# Fix CSS lint issues
fix-css:
    npx stylelint css/ --fix

# Start local dev server on port 8080
serve:
    python3 -m http.server 8080

# Start local dev server on custom port
serve-port port="8080":
    python3 -m http.server {{port}}

# Record demo GIF and MP4 (requires playwright + ffmpeg)
record-demo:
    node scripts/record-demo.js

# Build public/ directory for deployment
build:
    rm -rf public
    mkdir -p public/css public/js
    cp index.html public/
    cp css/style.css public/css/
    cp js/*.js public/js/

# Remove generated files
clean:
    rm -rf node_modules/ public/
