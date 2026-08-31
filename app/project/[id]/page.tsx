import { PublicProject } from "@/components/cloud-ide";

export default async function SharedProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProject id={id} />;
}
