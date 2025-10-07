import TradeDetailsClient from "./TradeDetailsClient";

type TradeDetailsPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function TradeDetailsPage({ params }: TradeDetailsPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;

  return <TradeDetailsClient tradeId={resolvedParams.id} />;
}
