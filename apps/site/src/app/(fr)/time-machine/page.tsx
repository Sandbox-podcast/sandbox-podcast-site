import { TimeMachine } from '@/components/time-machine';
import { JsonLd } from '@/components/json-ld';
import { siteConfig } from '@/config/site';
import { timeMachineJsonLd, timeMachineSeo } from '@/domain/time-machine-seo';
import { timeMachineData } from '@/lib/time-machine';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(timeMachineSeo(timeMachineData()));

export default function Page() {
  const data = timeMachineData();
  return (
    <>
      <TimeMachine data={data} />
      <JsonLd data={timeMachineJsonLd(data, siteConfig.url)} />
    </>
  );
}
