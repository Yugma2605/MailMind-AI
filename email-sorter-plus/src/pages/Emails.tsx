import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Classification {
  category: string;
  confidence?: number;
  reasoning?: string;
}

interface Email {
  id: string;
  subject: string | null;
  sender: string | null;
  snippet?: string | null;
  status: string;
  classification?: Classification | string | null;
  created_at: string;
}

// Handle JSONB + stringified JSON
function normalizeClassification(
  classification: Classification | string | null
): Classification | null {
  if (!classification) return null;
  if (typeof classification === "string") {
    try {
      return JSON.parse(classification);
    } catch (e) {
      console.error("Failed to parse classification:", e);
      return null;
    }
  }
  return classification;
}

const Emails = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, number>
  >({});

  // fetch emails once on mount
  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching emails:", error);
      } else {
        const normalized = data.map((email: Email) => ({
          ...email,
          classification: normalizeClassification(email.classification),
        }));
        setEmails(normalized);
      }
      setLoading(false);
    };

    fetchEmails();
  }, []);

  // realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("emails-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emails" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEmails((prev) => [
              {
                ...payload.new,
                classification: normalizeClassification(
                  payload.new.classification
                ),
              } as Email,
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setEmails((prev) =>
              prev.map((email) =>
                email.id === payload.new.id
                  ? {
                      ...payload.new,
                      classification: normalizeClassification(
                        payload.new.classification
                      ),
                    }
                  : email
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from("emails")
        .select(
          "id, subject, sender, snippet, status, classification, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((email: Email) => ({
        ...email,
        classification: normalizeClassification(email.classification),
      }));
      setEmails(normalized);
    } catch (err) {
      console.error("Error fetching emails:", err);
      toast({
        title: "Error",
        description: "Failed to fetch emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // group emails by classification category
  const groupedEmails = emails.reduce((acc, email) => {
    const categoryName =
      normalizeClassification(email.classification)?.category ||
      "Unclassified";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(email);
    return acc;
  }, {} as Record<string, Email[]>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLoadMore = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: (prev[category] || 7) + 7,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Classified Emails</h1>
              <p className="text-muted-foreground">
                Your emails organized by categories
              </p>
            </div>
            <div className="flex space-x-4">
              <Button onClick={fetchEmails}>Refresh</Button>
              <Button variant="outline" onClick={() => navigate("/welcome")}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Summary */}
          {Object.keys(groupedEmails).length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {Object.entries(groupedEmails).map(([categoryName, emails]) => (
                <Badge key={categoryName} variant="outline">
                  {categoryName}: {emails.length}
                </Badge>
              ))}
            </div>
          )}

          {/* Email Groups */}
          {Object.keys(groupedEmails).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No emails found. Waiting for new ones…
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedEmails).map(
                ([categoryName, categoryEmails]) => {
                  const limit = expandedCategories[categoryName] || 7;
                  const visibleEmails = categoryEmails.slice(0, limit);
                  const hasMore = categoryEmails.length > limit;

                  return (
                    <Card key={categoryName}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{categoryName}</span>
                          <Badge variant="secondary">
                            {categoryEmails.length} emails
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {visibleEmails.map((email) => (
                            <Card
                              key={email.id}
                              className="border-l-4 border-l-primary"
                            >
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-semibold text-lg">
                                    {email.subject}
                                  </h3>
                                  <Badge
                                    variant={
                                      email.status === "read"
                                        ? "secondary"
                                        : "default"
                                    }
                                  >
                                    {email.status}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm text-muted-foreground">
                                    From: {email.sender}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(email.created_at)}
                                  </p>
                                </div>
                                {email.snippet && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {email.snippet}
                                  </p>
                                )}
                                {normalizeClassification(
                                  email.classification
                                )?.category && (
                                  <div className="mt-2 p-2 bg-muted rounded-md">
                                    <p className="text-xs text-muted-foreground">
                                      Category:{" "}
                                      {
                                        normalizeClassification(
                                          email.classification
                                        )?.category
                                      }
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {hasMore && (
                          <div className="mt-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadMore(categoryName)}
                            >
                              Show more
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Emails;
