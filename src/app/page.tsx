import { getStudentsList, getPenaltyRecords } from "./actions";
import DisciplinaryApp from "@/components/DisciplinaryApp";

export default async function HomePage() {
  const [students, records] = await Promise.all([
    getStudentsList(),
    getPenaltyRecords(),
  ]);

  return <DisciplinaryApp initialStudents={students} initialRecords={records} />;
}
