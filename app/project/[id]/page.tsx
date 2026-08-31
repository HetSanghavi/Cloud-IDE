import { PublicProject } from "@/components/cloud-ide";

export default function SharedProjectPage({ params }: { params: { id: string } }) {
  return <PublicProject id={params.id} />;
}
