import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import {
  useDb,
  broadcastChange,
  useDbChanges,
  Patient,
  patientToSqlParams,
  saveToPGlite,
} from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";

const patientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  address: z.string().min(1, "Address is required"),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  medicalConditions: z.string().min(1, "Medical conditions are required"),
  medications: z.string().min(1, "Current medications are required"),
  allergies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

const FORM_ID = "patient_registration_form";

const DEFAULT_VALUES: PatientFormValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phone: "",
  address: "",
  insuranceProvider: "",
  insuranceNumber: "",
  medicalConditions: "",
  medications: "",
  allergies: "",
};

export function PatientForm() {
  const { db, loading, error } = useDb();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const saveFormData = async (values: Partial<PatientFormValues>) => {
    if (!db) return;

    try {
      await saveToPGlite(db, "form_persistence", FORM_ID, values);
    } catch (err) {
      console.error("Failed to save form data:", err);
    }
  };

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (db && !loading && Object.keys(value).length > 0) {
        const timeoutId = setTimeout(() => {
          saveFormData(value);
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, db, loading]);

  const watchedValues = form.watch();
  const isFormEmpty = useMemo(
    () =>
      Object.keys(DEFAULT_VALUES).every(
        (key) =>
          watchedValues[key as keyof PatientFormValues] ===
          DEFAULT_VALUES[key as keyof PatientFormValues]
      ),
    [watchedValues]
  );

  useEffect(() => {
    const loadFormData = async () => {
      if (!db || loading) return;

      try {
        const result = await db.query(
          `SELECT form_data FROM form_persistence WHERE form_id = $1`,
          [FORM_ID]
        );

        if (result.rows && result.rows.length > 0) {
          try {
            const parsedData = JSON.parse(result.rows[0].form_data);

            form.reset({
              ...DEFAULT_VALUES,
              ...parsedData,
              gender: parsedData.gender ?? "",
            });
          } catch (parseErr) {
            console.error("Failed to parse form data:", parseErr);
          }
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
      }
    };

    if (db && !loading) {
      loadFormData();
    }
  }, [db, loading, form]);


  const clearForm = async (showToast = true) => {
    if (!db) return;
  
    try {
      form.reset(DEFAULT_VALUES);
  
      await db.query(`DELETE FROM form_persistence WHERE form_id = $1`, [
        FORM_ID,
      ]);
  
      if (showToast) {
        toast({
          title: "Form cleared",
          description: "All form fields have been reset",
        });
      }
  
      broadcastChange("form-cleared", { id: FORM_ID });
    } catch (err) {
      console.error("Failed to clear form:", err);
      toast({
        variant: "destructive",
        title: "Error clearing form",
        description: "Failed to reset form fields",
      });
    }
  };

  async function onSubmit(values: PatientFormValues) {
    if (!db || loading) return;

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const id = uuidv4();

      const patient: Patient = {
        id,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        email: values.email || "",
        phone: values.phone || "",
        address: values.address || "",
        insuranceProvider: values.insuranceProvider || "",
        insuranceNumber: values.insuranceNumber || "",
        medicalConditions: values.medicalConditions || "",
        medications: values.medications || "",
        allergies: values.allergies || "",
        createdAt: now,
        updatedAt: now,
      };

      const params = patientToSqlParams(patient);
      await db.query(
        `
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, gender, 
          email, phone, address, insurance_provider, insurance_number, 
          medical_conditions, medications, allergies, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `,
        params
      );

      broadcastChange("patient-added", { id });

      toast({
        title: "Patient registered successfully",
        description: `${values.firstName} ${values.lastName} has been added to the system.`,
      });

      clearForm(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDbChange = useCallback(
    (message: any) => {
      if (message.type === "form-cleared" && message.data?.id === FORM_ID) {
        form.reset(DEFAULT_VALUES);
      }
    },
    [form]
  );

  useDbChanges(handleDbChange);

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-destructive">
          Failed to load database: {error.message}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full animate-fade-in theme-transition">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">Patient Registration</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearForm(true)}
          className="text-green-500 border-green-500 hover:bg-green-100 hover:text-green-600 flex items-center gap-1"
          disabled={isFormEmpty}
        >
          <RefreshCcw className="h-4 w-4" />
          Clear Form
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Shubham" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Badiwal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="shubham.badiwal@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="959595959"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="\d{10}"
                        value={field.value}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          field.onChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="111 Main St, City, State, ZIP"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="insuranceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Insurance Company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Policy #" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medicalConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List any existing medical conditions"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Medications</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List any medications the patient is currently taking"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List any known allergies"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isSubmitting}
            >
              {isSubmitting ? "Registering..." : "Register Patient"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
