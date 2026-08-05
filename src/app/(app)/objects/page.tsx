import { ObjectsScreen } from "@/components/objects/ObjectsScreen";
import { objects } from "@/lib/mock/objects";

export default function ObjectsPage() {
  return <ObjectsScreen objects={objects} />;
}
