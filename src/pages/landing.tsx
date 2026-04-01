import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { PageLayout, PageHeader, GlowingLine } from "../components/ui";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export function LandingPage() {
  return (
    <PageLayout className="text-center">
      {/* Hero Section */}
      <section className="flex flex-col items-center">
        <PageHeader
          eyebrow="A Conversation Across Time"
          title="Meet Your Future Self"
          subtitle="Clone your voice. Describe your crossroads. Have a real conversation with who you could become — 10 years from now."
          className="mb-12"
        />

        {/* Glowing audio line */}
        <GlowingLine className="mb-12" />

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
        >
          <Link to="/setup">
            <Button size="lg" className="rounded-full px-8">
              <span>Start your conversation</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </PageLayout>
  );
}
