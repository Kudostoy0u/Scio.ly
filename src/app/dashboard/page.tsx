import { Metadata } from "next";
import Content from "@/app/dashboard/Content";

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: "Scio.ly | Dashboard",
  description: "Track your Scioly test-taking performance across several statistics"
}
export default function Page() {
  return <Content />;
}