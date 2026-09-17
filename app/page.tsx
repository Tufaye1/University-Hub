import { FinderClient } from '@/components/FinderClient';
import { getPrograms } from '@/lib/airtable';
export const revalidate = 300;
export default async function Home() { return <FinderClient programs={await getPrograms()} />; }
