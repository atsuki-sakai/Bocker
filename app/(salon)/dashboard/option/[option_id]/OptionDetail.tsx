// import { useQuery } from 'convex/react';
// import { api } from '@/convex/_generated/api';
// import { Id } from '@/convex/_generated/dataModel';

interface OptionDetailProps {
  option_id: string;
}

export default function OptionDetail({ option_id }: OptionDetailProps) {
  // const option = useQuery(api.option.core.get, {
  //   salonOptionId: option_id as Id<'salon_option'>,
  // });
  return <div>{JSON.stringify(option_id)}</div>;
}
