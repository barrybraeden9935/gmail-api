const { createClient } = require('@supabase/supabase-js');

async function initDB(supabaseUrl, supabaseKey ) {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    return supabase
}

module.exports = { 
    initDB,
}
