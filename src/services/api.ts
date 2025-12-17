import { supabase } from "../supabaseClient";

export interface CrewMember {
    id?: string;
    company_id: string;
    first_name: string | null;
    last_name: string | null;
    sex?: string | null;
    date_of_birth: string | null;
    id_card_number: string | null;
    patent_number: string | null;
    address: string | null;
    phone: string | null;
    mobile: string | null;
    position: string | null;
    department: string | null;
    start_date: string | null;
    end_date: string | null;
    rate: number | null;
    daily_rate: number | null;
    per_week: string | null;
    day_worked: number | null;
    holiday_worked: string | null;
    travel_day: string | null;
    living_allowance: string | null;
    per_diem: string | null;
    accommodation: string | null;
    payment_method: string | null;
    bank_account_number: string | null;
    bank_name: string | null;
    account_code: string | null;
    travel_date: string | null;
    notes: string | null;
    project_title: string | null;
    job_id?: string | null;
    ice?: string | null;
    if_number?: string | null;
    created_at?: string;
}

export const api = {
    /**
     * Get Company ID by Name
     */
    getCompanyByName: async (name: string) => {
        const { data, error } = await supabase
            .from("companies")
            .select("id")
            .eq("name", name)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get All Companies
     */
    getAllCompanies: async () => {
        const { data, error } = await supabase
            .from("companies")
            .select("name")
            .order("name");

        if (error) throw error;
        return data;
    },

    /**
     * Create a new Company
     */
    createCompany: async (name: string) => {
        const { data, error } = await supabase
            .from("companies")
            .insert([{ name }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new Job
     */
    createJob: async (name: string, companyId: string) => {
        const { data, error } = await supabase
            .from("jobs")
            .insert([{ name, company_id: companyId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get Job by ID
     */
    getJobById: async (id: string) => {
        const { data, error } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a Job
     */
    deleteJob: async (id: string) => {
        const { error } = await supabase
            .from("jobs")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return true;
    },

    /**
     * Get Crew Members for a Company, optionally filtered by Job ID
     */
    getCrewMembers: async (companyId: string, jobId?: string) => {
        let query = supabase
            .from("crew_members")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (jobId) {
            query = query.eq("job_id", jobId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get a single Crew Member by ID
     */
    getCrewMemberById: async (id: string) => {
        const { data, error } = await supabase
            .from("crew_members")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new Crew Member
     */
    createCrewMember: async (member: CrewMember) => {
        const { data, error } = await supabase
            .from("crew_members")
            .insert([member])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    createStarterForm: async (member: CrewMember) => {
        return api.createCrewMember(member);
    },

    /**
     * Update a Crew Member
     */
    updateCrewMember: async (id: string, updates: Partial<CrewMember>) => {
        const { data, error } = await supabase
            .from("crew_members")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a Crew Member
     */
    deleteCrewMember: async (id: string) => {
        const { error } = await supabase
            .from("crew_members")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return true;
    }
};