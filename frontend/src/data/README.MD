# How to Add a New Problem

## Step 1: Add to problems.ts

1. Open `problems.ts` in `frontend/src/data`
2. Add a new problem object to the array
3. Save the file

Example:

```typescript
export const problems: Problem[] = [
  // ... existing problems ...
  
  {
    id: "3",
    title: "FizzBuzz",
    description: "A decription of the task",
    difficulty: "Easy",
    tags: ["math", "io"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    // Reverse the string and print it
}
`,
  },
];
```

## Step 2: Create test cases

1. Go to the `runner/problems` folder in `root`
2. Create a new folder with the same `id` as your problem (e.g., `3`)
3. Inside that folder, create a file named `tests.json`
4. Add your test cases

Example `runner/problems/3/tests.json`:

```json
[
  {
    "name": "sample1",
    "input": "2 3\n",
    "expected": "5",
    "hidden": false
  },
  {
    "name": "hidden1",
    "input": "10 10\n",
    "expected": "20",
    "hidden": true
  }
]
``` 