async function getUserByEmail(supabase, email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error finding user by email:', email, err);
    return null;
  }
}

async function insertUser(supabase, userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(userData);

    console.log(data, error);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error inserting user:', err);
    return null;
  }
}

module.exports = {
  getUserByEmail,
  insertUser,
};
