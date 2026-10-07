import { redirect } from 'next/navigation';

export default function LatestPage(): never {
  redirect('/episodes');
}
