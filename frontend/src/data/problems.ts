export type ProblemType = "solve" | "fix";

export function getProblem(id: string): Problem | undefined {
  return problems.find(p => p.id === id);
}

export function getStarterCode(id: string): string {
  const problem = getProblem(id);
  return problem?.starterCode ?? '';
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
  {
    id: "1",
    title: "A + B",
    description: "Read two integers from stdin and print their sum.",
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
    title: "Count the E's",
    description:
      "Read a single word from stdin and print how many times the letter `e` (lowercase) appears in it.",
    difficulty: "Easy",
    tags: ["strings", "basics"],
    points: 50,
    type: "solve",
    starterCode: `#include <iostream>
#include <string>
using namespace std;
 
int main() {
    // Read a word and count the letter 'e'
}
`,
  },
  {
    id: "3",
    title: "FizzBuzz",
    description: "Print numbers 1 to N, but replace multiples of 3 with 'Fizz', multiples of 5 with 'Buzz', and multiples of both with 'FizzBuzz'.",
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
    id: "4",
    title: "Fix the Sum",
    description: "This program should compute the sum 1 + 2 + ... + N, but it has a bug. Find and fix it.",
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
  {
    id: "5",
    title: "JSON Name Lookup",
    description: "This program reads a name from stdin and looks it up in data.json to print the matching score. The code has a bug in the string parsing logic — find and fix it.",
    difficulty: "Medium",
    tags: ["file-io", "parsing"],
    points: 100,
    type: "fix",
    dataFile: "data.json",
    starterCode: `#include <iostream>
#include <fstream>
#include <string>
using namespace std;
 
int main() {
    ifstream file("data.json");
    if (!file.is_open()) {
        cout << "ERROR" << endl;
        return 1;
    }
 
    string target;
    cin >> target;
 
    string line;
    while (getline(file, line)) {
        // Find the "name" field in each line
        size_t namePos = line.find("\\"name\\"");
        if (namePos == string::npos) continue;
 
        size_t colonPos = line.find(":", namePos);
        size_t firstQuote = line.find("\\"", colonPos + 1);
        size_t secondQuote = line.find("\\"", firstQuote);
        string name = line.substr(firstQuote + 1, secondQuote - firstQuote - 1);
 
        if (name == target) {
            // Find the "score" field on the next line
            if (getline(file, line)) {
                size_t sPos = line.find("\\"score\\"");
                size_t sColon = line.find(":", sPos);
                // Extract the number after the colon
                string numStr;
                for (size_t i = sColon + 1; i < line.size(); i++) {
                    if (line[i] >= '0' && line[i] <= '9') numStr += line[i];
                }
                cout << numStr << endl;
                return 0;
            }
        }
    }
 
    cout << "NOT_FOUND" << endl;
    return 0;
}
`,
  },
  {
    id: "6",
    title: "CSV Average",
    description: "This program reads a column name from stdin, then computes the average of that column's values from data.csv. The CSV parsing has a bug — find and fix it.",
    difficulty: "Medium",
    tags: ["file-io", "csv", "debugging"],
    points: 100,
    type: "fix",
    dataFile: "data.csv",
    starterCode: `#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <iomanip>
using namespace std;
 
int main() {
    ifstream file("data.csv");
    if (!file.is_open()) {
        cout << "ERROR" << endl;
        return 1;
    }
 
    string targetCol;
    getline(cin, targetCol);
 
    // Read header row
    string header;
    getline(file, header);
 
    // Find which column index matches the target
    int colIndex = -1;
    int idx = 0;
    stringstream hss(header);
    string col;
    while (getline(hss, col, ',')) {
        if (col == targetCol) {
            colIndex = idx;
            break;
        }
        idx++;
    }
 
    if (colIndex == -1) {
        cout << "NOT_FOUND" << endl;
        return 0;
    }
 
    // Read data rows and accumulate the target column
    double total = 0.0;
    int count = 0;
    string row;
    while (getline(file, row)) {
        stringstream rss(row);
        string field;
        int i = 0;
        while (getline(rss, field, ',')) {
            if (i == colIndex) {
                total += stod(field);
            }
            i++;
        }
        count++;
    }
 
    if (count == 0) {
        cout << "NO_DATA" << endl;
        return 0;
    }
 
    cout << fixed << setprecision(2) << total / count << endl;
    return 0;
}
`,
  },
  {
    id: "7",
    title: "CSV Top Scorer",
    description:
      "Read the file `data.csv` which has columns `name` and `score`. Print the name of the person with the highest score. If there is a tie, print the first one that appears in the file.",
    difficulty: "Easy",
    tags: ["file-io", "csv"],
    points: 75,
    type: "solve",
    dataFile: "data.csv",
    starterCode: `#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
using namespace std;
 
int main() {
    // Open data.csv and find the name with the highest score
}
`,
  },
  {
    id: "8",
    title: "JSON Inventory Total",
    description:
      'Read the file `data.json` which contains an array of objects, each with `"item"` (string), `"price"` (number), and `"qty"` (number). Print the total inventory value (sum of price * qty for every item), formatted to exactly 2 decimal places.',
    difficulty: "Easy",
    tags: ["file-io", "json"],
    points: 75,
    type: "solve",
    dataFile: "data.json",
    starterCode: `#include <iostream>
#include <fstream>
#include <string>
#include <iomanip>
using namespace std;
 
int main() {
    // Open data.json and compute the total inventory value
}
`,
  },
];