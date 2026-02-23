import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bbvdctpmyhsydnpseuvz.supabase.co";
const supabaseAnonKey = "sb_publishable_l_f9mvxnd2UO2W39UuxrpQ_fQrdOIrT";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);