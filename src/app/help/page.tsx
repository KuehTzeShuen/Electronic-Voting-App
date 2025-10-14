"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpPage() {
  return (
    <section className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Help & FAQ</h1>
      <p className="text-muted-foreground mb-8 text-center">
        Feel free to contact us if you need further assistance!
      </p>

      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="item-1">
          <AccordionTrigger>How do I create a new poll?</AccordionTrigger>
          <AccordionContent>
            Go to your dashboard and click the <strong>“New Poll”</strong> button.
            Fill in your poll title, description, and options, then click
            <strong> “Create”</strong>. Your poll will appear on your dashboard.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>Who can vote in my poll?</AccordionTrigger>
          <AccordionContent>
            By default, only members with the link can vote. You can change this
            in the poll settings to allow public or restricted voting based on
            your club’s needs.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>Can I edit a poll after publishing?</AccordionTrigger>
          <AccordionContent>
            You can edit a poll’s title or description before anyone votes. Once
            votes are submitted, editing is disabled to preserve fairness.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>How do I see poll results?</AccordionTrigger>
          <AccordionContent>
            After a poll closes, results appear automatically under the poll in
            your dashboard. You’ll see percentage breakdowns and total votes per
            option.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>I forgot my password. What should I do?</AccordionTrigger>
          <AccordionContent>
            Click <strong>“Forgot password?”</strong> on the login page. Enter your
            registered email, and we’ll send you a reset link.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
