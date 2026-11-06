import { getStudentsList, getPenaltyRecords, getHomeworkTasks, getTaskCompletions } from "./actions";
import DisciplinaryApp from "@/components/DisciplinaryApp";

export default async function HomePage() {
  const [students, records, tasks, completions] = await Promise.all([
    getStudentsList(),
    getPenaltyRecords(),
    getHomeworkTasks(),
    getTaskCompletions(),
  ]);

  return (
    <DisciplinaryApp
      initialStudents={students}
      initialRecords={records}
      initialTasks={tasks}
      initialCompletions={completions}
    />
  );
}
