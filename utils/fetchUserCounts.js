import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export async function fetchUserCounts(userId) {
    try {
        const { data, error } = await supabase
            .from("user_stats")
            .select("messages, reacts_given, reacts_received")
            .eq("user_id", userId)
            .single();

        if (error) throw error;

        return {
            messages: data?.messages || 0,
            reactsGiven: data?.reacts_given || 0,
            reactsReceived: data?.reacts_received || 0,
        };
    } catch (error) {
        console.error("Error fetching user counts:", error);
        throw error;
    }
}