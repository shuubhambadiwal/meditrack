import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { useDb, broadcastChange, Patient, patientToSqlParams } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
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

const STORAGE_KEY = "patient_form_data";

// Default values as a constant for reuse
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

  let initialValues = DEFAULT_VALUES;
  const savedData = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      initialValues = { ...DEFAULT_VALUES, ...parsedData };
      } catch (err) {
        console.error("Failed to parse saved form data:", err);
      }
    } 

  const saveFormData = (values: Partial<PatientFormValues>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch (err) {
      console.error("Failed to save form data:", err);
    }
  };

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((value) => saveFormData(value));
    return () => subscription.unsubscribe();
  }, [form]);

  const isFormEmpty = useMemo(() => {
    const values = form.getValues();
    return Object.values(values).every((v) => v === "" || v === undefined);
  }, [form.watch()]);

  const handleClearForm = () => {
    form.reset(DEFAULT_VALUES);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Form cleared",
      description: "The patient form has been reset.",
    });
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
      localStorage.removeItem(STORAGE_KEY);

      toast({
        title: "Patient registered successfully",
        description: `${values.firstName} ${values.lastName} has been added to the system.`,
      });

      form.reset(DEFAULT_VALUES);
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
          onClick={handleClearForm}
          disabled={isFormEmpty}
          className="text-green-500 border-green-500 hover:bg-green-100 hover:text-green-600 flex items-center gap-1"
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
                      <Input placeholder="John" {...field} />
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
                      <Input placeholder="Doe" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
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
                        placeholder="john.doe@example.com"
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
                        placeholder="(123) 456-7890"
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
                      placeholder="123 Main St, City, State, ZIP"
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
