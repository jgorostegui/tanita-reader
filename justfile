# Development tasks for Tanita Reader

# Start local dev server
serve:
    python3 -m http.server 8080

# Run unit tests
test:
    node --test 'test/**/*.test.js'

# Lint all files
lint:
    npx eslint js/ && npx stylelint css/

# Auto-fix lint issues
fix:
    npx eslint js/ --fix && npx stylelint css/ --fix

# Record demo video (assets/demo.mp4 + assets/demo.gif)
record-demo:
    node scripts/record-demo.js
