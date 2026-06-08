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
    city?: string | null;
    zip_code?: string | null;
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

export interface ContractRecord {
    id?: string;
    crew_member_id: string;
    file_path: string;
    contract_name: string;
    created_at?: string;
    updated_at?: string;
}

const isMissingContractsTable = (error: unknown) => {
    const candidate = error as { code?: string; message?: string; status?: number };
    const message = String(candidate?.message || "").toLowerCase();

    return (
        candidate?.status === 404 ||
        candidate?.code === "PGRST205" ||
        message.includes("contracts") && (
            message.includes("schema cache") ||
            message.includes("could not find") ||
            message.includes("does not exist")
        )
    );
};

const listStoredContracts = async (crewMemberIds?: string[]) => {
    const requestedIds = crewMemberIds ? new Set(crewMemberIds) : null;
    const { data: folders, error: folderError } = await supabase.storage
        .from("contracts")
        .list("", { limit: 1000 });

    if (folderError) throw folderError;

    const folderNames = (folders || [])
        .map((folder) => folder.name)
        .filter((name) => !requestedIds || requestedIds.has(name));

    const records = await Promise.all(
        folderNames.map(async (crewMemberId) => {
            const { data: files, error } = await supabase.storage
                .from("contracts")
                .list(crewMemberId, {
                    limit: 1000,
                    sortBy: { column: "created_at", order: "desc" },
                });

            if (error) throw error;

            return (files || []).map((file) => {
                const storedName = file.name.replace(/^\d+_/, "");
                return {
                    id: `${crewMemberId}/${file.name}`,
                    crew_member_id: crewMemberId,
                    file_path: `${crewMemberId}/${file.name}`,
                    contract_name: storedName,
                    created_at: file.created_at,
                    updated_at: file.updated_at,
                } as ContractRecord;
            });
        })
    );

    return records
        .flat()
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
};

export const api = {
    /**
     * Get Company ID by Name
     */
    getCompanyByName: async (name: string) => {
        const { data, error } = await supabase
            .from("companies")
            .select("id")
            .eq("name", name.trim())
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error(`Company introuvable: ${name}`);
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
        const normalizedName = name.trim();
        if (!normalizedName) throw new Error("Le nom de la compagnie est obligatoire.");

        const { data: existing, error: existingError } = await supabase
            .from("companies")
            .select("*")
            .eq("name", normalizedName)
            .limit(1)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) throw new Error("Une compagnie avec ce nom existe deja.");

        const { data, error } = await supabase
            .from("companies")
            .insert([{ name: normalizedName }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new Job
     */
    createJob: async (name: string, companyId: string) => {
        const normalizedName = name.trim();
        if (!normalizedName) throw new Error("Le nom du job est obligatoire.");

        const { data: existing, error: existingError } = await supabase
            .from("jobs")
            .select("*")
            .eq("company_id", companyId)
            .eq("name", normalizedName)
            .limit(1)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) throw new Error("Un job avec ce nom existe deja dans cette compagnie.");

        const { data, error } = await supabase
            .from("jobs")
            .insert([{ name: normalizedName, company_id: companyId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all jobs for a company.
     */
    getJobsByCompany: async (companyId: string) => {
        const { data, error } = await supabase
            .from("jobs")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

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
     * Search in the global starter form database, across all companies and jobs.
     */
    searchCrewMembers: async (search: string) => {
        const normalize = (value: unknown) =>
            String(value || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();

        const uniquePeople = (members: CrewMember[]) => {
            const byPerson = new Map<string, CrewMember>();

            members.forEach((member) => {
                const idCard = normalize(member.id_card_number).replace(/\s+/g, "");
                const fallbackKey = [
                    normalize(member.first_name).trim(),
                    normalize(member.last_name).trim(),
                    normalize(member.date_of_birth).trim(),
                    normalize(member.phone).trim(),
                    normalize(member.mobile).trim(),
                ].join("|");
                const key = idCard || fallbackKey;

                if (!key || key === "||||") return;

                if (!byPerson.has(key)) {
                    byPerson.set(key, member);
                }
            });

            return Array.from(byPerson.values());
        };

        const term = search.trim().replace(/[%,]/g, "");

        if (!term) return [];

        const { data, error } = await supabase
            .from("crew_members")
            .select("*")
            .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
            .order("created_at", { ascending: false })
            .limit(30);

        if (error) throw error;

        if (data && data.length > 0) return uniquePeople(data);

        const { data: fallbackData, error: fallbackError } = await supabase
            .from("crew_members")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(500);

        if (fallbackError) throw fallbackError;

        const terms = normalize(term).split(/\s+/).filter(Boolean);

        const filtered = (fallbackData || []).filter((member) => {
            const haystack = normalize([
                member.first_name,
                member.last_name,
                member.position,
                member.department,
                member.project_title,
                member.id_card_number,
            ].join(" "));

            return terms.every((part) => haystack.includes(part));
        });

        return uniquePeople(filtered);
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
     * Get multiple Crew Members by ID.
     */
    getCrewMembersByIds: async (ids: string[]) => {
        if (ids.length === 0) return [];

        const { data, error } = await supabase
            .from("crew_members")
            .select("*")
            .in("id", ids);

        if (error) throw error;
        return data as CrewMember[];
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

    /**
     * Copy an existing starter form into a company/job.
     * This keeps the original history intact and creates a new assignment row.
     */
    duplicateCrewMemberForAssignment: async (
        sourceMemberId: string,
        companyId: string,
        jobId?: string | null
    ) => {
        const source = await api.getCrewMemberById(sourceMemberId);

        if (source.id_card_number) {
            let existingQuery = supabase
                .from("crew_members")
                .select("*")
                .eq("company_id", companyId)
                .eq("id_card_number", source.id_card_number)
                .limit(1);

            existingQuery = jobId
                ? existingQuery.eq("job_id", jobId)
                : existingQuery.is("job_id", null);

            const { data: existing, error: existingError } = await existingQuery.maybeSingle();
            if (existingError) throw existingError;
            if (existing) return existing;
        }

        const copy = {
            ...source,
            company_id: companyId,
            job_id: jobId || null,
        } as Record<string, unknown>;

        delete copy.id;
        delete copy.created_at;

        const { data, error } = await supabase
            .from("crew_members")
            .insert([copy])
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
    },

    /**
     * Upload a generated contract PDF and store its metadata.
     * Requires a Supabase Storage bucket named "contracts" and a "contracts" table.
     */
    saveContract: async (
        crewMemberId: string,
        contractName: string,
        pdfBlob: Blob
    ) => {
        const safeName = contractName
            .replace(/[^a-z0-9._-]+/gi, "_")
            .replace(/_+/g, "_");
        const filePath = `${crewMemberId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from("contracts")
            .upload(filePath, pdfBlob, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) throw uploadError;

        const { data, error } = await supabase
            .from("contracts")
            .insert([
                {
                    crew_member_id: crewMemberId,
                    file_path: filePath,
                    contract_name: contractName,
                    updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) {
            // The PDF is already safely stored. Until the optional metadata table
            // is installed, reconstruct contract records directly from Storage.
            if (isMissingContractsTable(error)) {
                return {
                    id: filePath,
                    crew_member_id: crewMemberId,
                    file_path: filePath,
                    contract_name: contractName,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as ContractRecord;
            }

            await supabase.storage.from("contracts").remove([filePath]);
            throw error;
        }
        return data as ContractRecord;
    },

    /**
     * List generated contracts for a list of crew members.
     */
    getContractsByCrewMemberIds: async (crewMemberIds: string[]) => {
        if (crewMemberIds.length === 0) return [];

        const { data, error } = await supabase
            .from("contracts")
            .select("*")
            .in("crew_member_id", crewMemberIds)
            .order("created_at", { ascending: false });

        if (error) {
            if (isMissingContractsTable(error)) {
                return listStoredContracts(crewMemberIds);
            }
            throw error;
        }
        return data as ContractRecord[];
    },

    /**
     * List all generated contracts.
     */
    getAllContracts: async () => {
        const { data, error } = await supabase
            .from("contracts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            if (isMissingContractsTable(error)) {
                return listStoredContracts();
            }
            throw error;
        }
        return data as ContractRecord[];
    },

    /**
     * Download a contract PDF blob from Supabase Storage.
     */
    downloadContractFile: async (filePath: string) => {
        const { data, error } = await supabase.storage
            .from("contracts")
            .download(filePath);

        if (error) throw error;
        return data;
    }
};
