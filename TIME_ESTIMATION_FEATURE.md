# Time Estimation Feature

## Overview
The Time Estimation feature uses AI to provide realistic time estimates for tasks based on different developer experience levels. This helps with project planning and resource allocation.

## How it Works

### 1. **Time Estimation Button**
- Each history card now has a ⏱️ (timer) button
- The button appears purple/gray when no estimation exists
- When an estimation is generated, the button turns purple with a green indicator dot

### 2. **AI-Powered Estimations**
The system analyzes:
- Task title and description
- Task complexity and scope
- Implementation requirements
- Testing and code review time
- Documentation needs
- Potential research/learning time

### 3. **Experience Levels**
- **🎓 Junior Developer (0-2 years)**: Higher time estimates considering learning curve
- **💻 Mid-level Developer (2-5 years)**: Moderate time estimates
- **🏆 Senior Developer (5+ years)**: Lower time estimates based on experience

### 4. **Tooltip Display**
- Click the ⏱️ button to generate estimations (first time)
- Hover over the button to view existing estimations
- Tooltip shows time for each experience level plus reasoning
- Auto-hides after 10 seconds or when clicking elsewhere

## Usage Instructions

1. **Navigate to History Tab**: Open the extension and go to the History tab
2. **Find a Task**: Locate the history item you want to estimate
3. **Generate Estimation**: Click the ⏱️ button to generate time estimation
4. **View Results**: The AI will provide estimates for all three experience levels
5. **Hover for Quick View**: Once generated, hover over the button to see estimates quickly

## Features

- **Persistent Storage**: Estimations are saved and don't need to be regenerated
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Error Handling**: Graceful handling of API errors and network issues
- **Visual Indicators**: Clear visual feedback for button states
- **Responsive Design**: Works well on different screen sizes

## Technical Details

- Uses the same Gemini API as other AI features
- Respects rate limits (10 requests per minute)
- Estimations are stored in the browser's storage
- Lightweight tooltip implementation with proper positioning
- Follows the existing code architecture and patterns

## API Requirements

- Requires a valid Gemini API key (set in Settings)
- Uses conservative API parameters for consistent results
- Handles API errors gracefully with user-friendly messages

## Time Format

All time estimates are provided in a human-readable format:
- `45min` - Less than an hour
- `1h 30min` - Hours and minutes
- `2h` - Exact hours

The system ensures realistic estimates with minimums of 15 minutes and reasonable maximums for task scope.
