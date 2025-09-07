import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Category {
  id: number;
  name: string;
  description?: string;
  user_id: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; description?: string }>({
    name: "",
    description: "",
  });

  // Start editing a category
  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditValues({ name: category.name, description: category.description || "" });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ name: "", description: "" });
  };

  // Save edit
  const saveEdit = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editValues),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)));
        toast({ title: "Updated", description: "Category updated successfully" });
        cancelEditing();
      } else {
        toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  // Inside fetchCategories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);

        if (data.length === 0) {
          toast({
            title: "Welcome!",
            description: "It looks like you're new here. Please create your categories to get started.",
          });
        }
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newCategory.name, 
          description: newCategory.description 
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category added successfully",
        });
        setNewCategory({ name: "", description: "" });
        fetchCategories();
      } else {
        throw new Error("Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast({ title: "Deleted", description: "Category removed successfully" });
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  const editCategory = async (id: number, updated: { name: string; description?: string }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updated),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)));
        toast({ title: "Updated", description: "Category updated successfully" });
      } else {
        toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Categories</h1>
              <p className="text-muted-foreground">Manage your email classification categories</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/welcome")}>
              Back to Dashboard
            </Button>
          </div>

          {/* Add New Category */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>Create a new category for email classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={addCategory} disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Category"}
              </Button>
            </CardContent>
          </Card>

          {/* Categories List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Categories</h2>
            {categories.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <h2 className="text-xl font-semibold mb-2">Welcome! 🎉</h2>
                  <p className="text-muted-foreground mb-4">
                    You don’t have any categories yet. To organize your emails, please create some categories like:
                    <br /> Applied Jobs, Rejected Jobs, Next Steps, OTP Emails, Job Recommendations.
                  </p>
                  <Button onClick={() => setIsAdding(true)}>Add Your First Category</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="w-full">
                          {editingId === category.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editValues.name}
                                onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Category name"
                              />
                              <Textarea
                                value={editValues.description}
                                onChange={(e) =>
                                  setEditValues((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Description (optional)"
                              />
                            </div>
                          ) : (
                            <>
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                              {category.description && (
                                <CardDescription className="mt-1">{category.description}</CardDescription>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {editingId === category.id ? (
                            <>
                              <Button size="sm" onClick={() => saveEdit(category.id)}>
                                Save
                              </Button>
                              <Button variant="outline" size="sm" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" onClick={() => startEditing(category)}>
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteCategory(category.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;