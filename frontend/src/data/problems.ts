export type ProblemType = "solve" | "fix";

export function getProblem(id: string): Problem | undefined {
  return problems.find(p => p.id === id);
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  points: number;
  type: ProblemType;
  starterCode: string;
  dataFile?: string;
}

export const problems: Problem[] = [
  // ==================== EASY (7 tasks) ====================
  {
    id: "1",
    title: "Multiply Two Numbers",
    description: "Read two integers from stdin and print their product.",
    difficulty: "Easy",
    tags: ["io", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read two integers and print their product
}
`,
  },
  {
    id: "2",
    title: "Even or Odd",
    description: "Read an integer from stdin and print `Even` if it is even or `Odd` if it is odd.",
    difficulty: "Easy",
    tags: ["math", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read an integer and print "Even" or "Odd"
}
`,
  },
  {
    id: "3",
    title: "Reverse a String",
    description: "Read a single word from stdin and print it reversed.",
    difficulty: "Easy",
    tags: ["strings", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read a word and print it reversed
}
`,
  },
  {
    id: "4",
    title: "Find the Maximum",
    description: "Read an integer N followed by N integers. Print the largest integer.",
    difficulty: "Easy",
    tags: ["arrays", "basics"],
    points: 60,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N, then N integers, and print the maximum
}
`,
  },
  {
    id: "5",
    title: "Count Vowels",
    description: "Read a single word from stdin and print the number of vowels (a, e, i, o, u — lowercase only) it contains.",
    difficulty: "Easy",
    tags: ["strings", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read a word and count the vowels
}
`,
  },
  {
    id: "6",
    title: "Sum of Array",
    description: "Read an integer N, then N integers. Print their sum.",
    difficulty: "Easy",
    tags: ["arrays", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N, then N integers, and print their sum
}
`,
  },
  {
    id: "7",
    title: "Celsius to Fahrenheit",
    description: "Read an integer temperature in Celsius from stdin. Print the equivalent temperature in Fahrenheit, rounded down to the nearest integer. Formula: F = C * 9 / 5 + 32.",
    difficulty: "Easy",
    tags: ["math", "basics"],
    points: 60,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read Celsius and print Fahrenheit (integer, rounded down)
}
`,
  },

  // ==================== MEDIUM (7 tasks) ====================
  {
    id: "8",
    title: "Palindrome Check",
    description: "Read a single word from stdin. Print `YES` if it is a palindrome (reads the same forwards and backwards) or `NO` otherwise.",
    difficulty: "Medium",
    tags: ["strings", "logic"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read a word and check if it is a palindrome
}
`,
  },
  {
    id: "9",
    title: "Prime Number Check",
    description: "Read an integer N (N >= 2) from stdin. Print `PRIME` if it is a prime number, or `NOT PRIME` otherwise.",
    difficulty: "Medium",
    tags: ["math", "logic"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N and determine if it is prime
}
`,
  },
  {
    id: "10",
    title: "Fibonacci Sequence",
    description: "Read an integer N from stdin. Print the first N Fibonacci numbers (starting from 0, 1, 1, 2, 3, 5, ...) separated by spaces.",
    difficulty: "Medium",
    tags: ["math", "logic"],
    points: 80,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N and print the first N Fibonacci numbers
}
`,
  },
  {
    id: "11",
    title: "Matrix Diagonal Sum",
    description: "Read an integer N, then an N×N matrix of integers (row by row). Print the sum of the elements on the main diagonal (top-left to bottom-right).",
    difficulty: "Medium",
    tags: ["arrays", "math"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N, then the NxN matrix, and print the diagonal sum
}
`,
  },
  {
    id: "12",
    title: "Binary to Decimal",
    description: "Read a binary string (containing only '0' and '1') from stdin and print its decimal equivalent.",
    difficulty: "Medium",
    tags: ["math", "strings"],
    points: 75,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read a binary string and convert to decimal
}
`,
  },
  {
    id: "13",
    title: "Remove Duplicates",
    description: "Read an integer N, then N integers. Print the unique integers in the order they first appear, separated by spaces.",
    difficulty: "Medium",
    tags: ["arrays", "logic"],
    points: 80,
    type: "solve",
    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Read N integers and print only the unique ones in order
}
`,
  },
  {
    id: "14",
    title: "Word Frequency",
    description: "Read an integer N, then N words. Print each unique word followed by its count, one per line, in the order they first appear. Format: `word count`.",
    difficulty: "Medium",
    tags: ["strings", "arrays"],
    points: 80,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read N words and count each unique word's frequency
}
`,
  },

  // ==================== HARD (6 tasks) ====================
  {
    id: "15",
    title: "Longest Common Subsequence",
    description: "Read two strings from stdin (one per line). Print the length of their longest common subsequence.",
    difficulty: "Hard",
    tags: ["dp", "strings"],
    points: 100,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read two strings and find the length of their LCS
}
`,
  },
  {
    id: "16",
    title: "Merge Intervals",
    description: "Read an integer N, then N pairs of integers representing intervals [start, end]. Merge all overlapping intervals and print the resulting intervals, one per line, in the format `start end`, sorted by start value.",
    difficulty: "Hard",
    tags: ["sorting", "logic"],
    points: 100,
    type: "solve",
    starterCode: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // Read N intervals, merge overlapping ones, and print the result
}
`,
  },
  {
    id: "17",
    title: "Balanced Parentheses",
    description: "Read a string containing only `(`, `)`, `[`, `]`, `{`, `}`. Print `YES` if the parentheses are balanced and properly nested, or `NO` otherwise.",
    difficulty: "Hard",
    tags: ["stacks", "strings"],
    points: 100,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Read a string and check if brackets are balanced
}
`,
  },
  {
    id: "18",
    title: "Spiral Matrix",
    description: "Read an integer N, then an N×N matrix of integers (row by row). Print all elements in spiral order (clockwise, starting from top-left), separated by spaces.",
    difficulty: "Hard",
    tags: ["arrays", "logic"],
    points: 120,
    type: "solve",
    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Read NxN matrix and print elements in spiral order
}
`,
  },
  {
    id: "19",
    title: "Next Greater Element",
    description: "Read an integer N, then N integers. For each element, find the next greater element to its right. If none exists, output -1. Print the results space-separated.",
    difficulty: "Hard",
    tags: ["stacks", "arrays"],
    points: 100,
    type: "solve",
    starterCode: `#include <iostream>
#include <vector>
#include <stack>
using namespace std;

int main() {
    // Read N integers and find the next greater element for each
}
`,
  },
  {
    id: "20",
    title: "Longest Increasing Subsequence",
    description: "Read an integer N, then N integers. Print the length of the longest strictly increasing subsequence.",
    difficulty: "Hard",
    tags: ["dp", "arrays"],
    points: 120,
    type: "solve",
    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Read N integers and find the length of the longest increasing subsequence
}
`,
  },
];