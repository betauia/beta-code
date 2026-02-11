export type ProblemType = "solve" | "fix";

export interface Problem {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  points: number;
  type: ProblemType;
  starterCode: string;
}

export const problems: Problem[] = [
  {
    id: "1",
    title: "A + B",
    difficulty: "Easy",
    tags: ["io", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b;
}
`,
  },
  {
    id: "2",
    title: "FizzBuzz",
    difficulty: "Easy",
    tags: ["math", "io"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Write your FizzBuzz solution here
}
`,
  },
  {
    id: "3",
    title: "Fix the Sum",
    difficulty: "Easy",
    tags: ["debugging", "basics"],
    points: 60,
    type: "fix",
    starterCode: `#include <iostream>
using namespace std;
 
int main() {
    int n;
    cin >> n;
 
    int sum;
    for (int i = 1; i <= n; i++) {
        sum = sum + i;
    }
 
    cout << sum << endl;
    return 0;
}
`,
  },
];

// Helper function to get a problem by ID
export function getProblem(id: string): Problem | undefined {
  return problems.find((p) => p.id === id);
}

// Helper function to get starter code for a problem
export function getStarterCode(id: string): string {
  const problem = getProblem(id);
  return problem?.starterCode ?? `#include <iostream>
using namespace std;

int main() {
    // Write your C++ code here
}
`;
}