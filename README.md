# BETA-CODE

## Adding tasks

Tasks ("problems") are configured in three places: metadata, problem content, and tests. Follow the steps below to add a new task.

1. **Add metadata to the task list**
   - Edit `frontend/src/data/problems.ts`.
   - Append a new object with a unique `id`, `title`, `difficulty`, `tags`, and `points`.
   - The `id` must be a string and should match the folder name and problem data entry you add in the next steps.

2. **Add the problem statement + starter code**
   - Edit `frontend/src/pages/problems/[id].astro`.
   - In the `problemData` map, add a new entry keyed by your new `id`.
   - Provide a `statement` and a `starter` code snippet (C++).

3. **Add tests for the judge**
   - Create a new folder `frontend/problems/<id>/`.
   - Add `tests.json` in that folder with the following shape:

     ```json
     [
       { "name": "sample1", "input": "2 3\n", "expected": "5\n", "hidden": false },
       { "name": "hidden1", "input": "...", "expected": "...", "hidden": true }
     ]
     ```

   - The judge loads tests from `frontend/problems/<id>/tests.json` based on the `problemId` sent from the UI.

Once these three pieces are in place, your new task will appear on the Play page and can be opened and submitted.



## Start Docker

1. **Path**
   
   - Set path to beta-code in terminal
     
3. **Start Docker**
   
   - Run `docker build -t cpp-sandbox:latest .\sandbox` in terminal
     
5. **Start webserver**
   
   - Run: `npm run dev` in terminal

