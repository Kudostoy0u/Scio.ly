#!/bin/bash

# Chunked Test Runner for Scio.ly
# Shell script version for better compatibility

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BRIGHT='\033[1m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run a test chunk
run_chunk() {
    local name=$1
    local description=$2
    shift 2
    local patterns=("$@")
    
    print_color $CYAN "============================================================"
    print_color $BRIGHT "Running $name tests: $description"
    print_color $CYAN "============================================================"
    
    local start_time=$(date +%s)
    
    # Build the vitest command
    local pattern_str=""
    for pattern in "${patterns[@]}"; do
        pattern_str="$pattern_str $pattern"
    done
    
    local command="npx vitest run $pattern_str --reporter=verbose"
    print_color $BLUE "Command: $command"
    
    # Set memory limit and run
    export NODE_OPTIONS="--max-old-space-size=4096"
    
    if eval "$command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_color $GREEN "✅ $name tests passed in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_color $RED "❌ $name tests failed in ${duration}s"
        return 1
    fi
}

# Function to run all chunks
run_all_chunks() {
    print_color $BRIGHT "🚀 Starting chunked test run..."
    
    # Kill any existing vitest processes
    pkill -f "vitest" 2>/dev/null || true
    
    local chunks=(
        "utils:Utility functions and helpers:src/lib/utils/**/*.test.* src/lib/api/**/*.test.* src/lib/services/**/*.test.*"
        "app-core:Core app functionality:src/app/analytics/**/*.test.* src/app/docs/**/*.test.* src/app/plagiarism/**/*.test.* src/app/practice/**/*.test.* src/app/reports/**/*.test.* src/app/robots.test.*"
        "api:API routes and endpoints:src/app/api/**/__tests__/**/*.test.*"
        "teams:Teams functionality:src/app/teams/**/*.test.*"
        "codebusters:Codebusters features:src/app/codebusters/**/*.test.*"
        "test-features:Test and practice features:src/app/test/**/*.test.*"
        "unlimited:Unlimited practice features:src/app/unlimited/**/*.test.*"
    )
    
    local total_chunks=${#chunks[@]}
    local start_time=$(date +%s)
    local passed=0
    local failed=0
    
    print_color $BLUE "Total chunks: $total_chunks"
    
    for i in "${!chunks[@]}"; do
        local chunk_info="${chunks[$i]}"
        local name=$(echo "$chunk_info" | cut -d: -f1)
        local description=$(echo "$chunk_info" | cut -d: -f2)
        local patterns_str=$(echo "$chunk_info" | cut -d: -f3-)
        
        # Convert patterns string to array
        read -ra patterns <<< "$patterns_str"
        
        print_color $YELLOW "[$((i+1))/$total_chunks] Processing $name..."
        
        if run_chunk "$name" "$description" "${patterns[@]}"; then
            ((passed++))
        else
            ((failed++))
            print_color $RED "❌ Test chunk $name failed. Stopping execution."
            break
        fi
        
        # Small delay between chunks for memory cleanup
        if [ $i -lt $((total_chunks - 1)) ]; then
            print_color $YELLOW "⏳ Waiting 2 seconds for memory cleanup..."
            sleep 2
        fi
    done
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Summary
    print_color $CYAN "============================================================"
    print_color $BRIGHT "📊 TEST SUMMARY"
    print_color $CYAN "============================================================"
    
    print_color $BLUE "Total time: ${total_duration}s"
    print_color $GREEN "Passed: $passed/$total_chunks chunks"
    
    if [ $failed -gt 0 ]; then
        print_color $RED "Failed: $failed chunks"
        exit 1
    else
        print_color $GREEN "🎉 All test chunks passed!"
    fi
}

# Function to run specific chunk
run_specific_chunk() {
    local chunk_name=$1
    
    case $chunk_name in
        "utils")
            run_chunk "utils" "Utility functions and helpers" "src/lib/utils/**/*.test.*" "src/lib/api/**/*.test.*" "src/lib/services/**/*.test.*"
            ;;
        "app-core")
            run_chunk "app-core" "Core app functionality" "src/app/analytics/**/*.test.*" "src/app/docs/**/*.test.*" "src/app/plagiarism/**/*.test.*" "src/app/practice/**/*.test.*" "src/app/reports/**/*.test.*" "src/app/robots.test.*"
            ;;
        "api")
            run_chunk "api" "API routes and endpoints" "src/app/api/**/*.test.*"
            ;;
        "teams")
            run_chunk "teams" "Teams functionality" "src/app/teams/**/*.test.*"
            ;;
        "codebusters")
            run_chunk "codebusters" "Codebusters features" "src/app/codebusters/**/*.test.*"
            ;;
        "test-features")
            run_chunk "test-features" "Test and practice features" "src/app/test/**/*.test.*"
            ;;
        "unlimited")
            run_chunk "unlimited" "Unlimited practice features" "src/app/unlimited/**/*.test.*"
            ;;
        *)
            print_color $RED "❌ Unknown chunk: $chunk_name"
            print_color $YELLOW "Available chunks:"
            print_color $BLUE "  - utils: Utility functions and helpers"
            print_color $BLUE "  - app-core: Core app functionality"
            print_color $BLUE "  - api: API routes and endpoints"
            print_color $BLUE "  - teams: Teams functionality"
            print_color $BLUE "  - codebusters: Codebusters features"
            print_color $BLUE "  - test-features: Test and practice features"
            print_color $BLUE "  - unlimited: Unlimited practice features"
            exit 1
            ;;
    esac
}

# Function to list chunks
list_chunks() {
    print_color $BRIGHT "📋 Available test chunks:"
    print_color $BLUE "1. utils: Utility functions and helpers"
    print_color $BLUE "2. app-core: Core app functionality"
    print_color $BLUE "3. api: API routes and endpoints"
    print_color $BLUE "4. teams: Teams functionality"
    print_color $BLUE "5. codebusters: Codebusters features"
    print_color $BLUE "6. test-features: Test and practice features"
    print_color $BLUE "7. unlimited: Unlimited practice features"
}

# Main execution
case "${1:-}" in
    "all")
        run_all_chunks
        ;;
    "chunk")
        if [ -z "${2:-}" ]; then
            print_color $RED "❌ Please specify a chunk name"
            list_chunks
            exit 1
        fi
        run_specific_chunk "$2"
        ;;
    "list")
        list_chunks
        ;;
    *)
        print_color $BRIGHT "🧪 Chunked Test Runner"
        print_color $YELLOW "Usage:"
        print_color $BLUE "  ./scripts/test-chunks.sh all          # Run all chunks sequentially"
        print_color $BLUE "  ./scripts/test-chunks.sh chunk <name> # Run specific chunk"
        print_color $BLUE "  ./scripts/test-chunks.sh list         # List available chunks"
        echo ""
        list_chunks
        ;;
esac
