import EmbedTable from '../embed-table';

interface EmbedPageProps {
  params: { id: string };
}

export default function EmbedPage({ params }: EmbedPageProps) {
  return (
    <div className="p-4">
      <EmbedTable sessionId={params.id} />
    </div>
  );
}
