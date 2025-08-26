async function getRandomEmail(supabase) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('used', false)
      .eq('banned', false)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting random email:', err);
    return null;
  }
}

async function getEmailByAddress(supabase, address) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('email', address)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting email by address:', err);
    return null;
  }
}

async function getAllEmails(supabase) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('used', true)
      .eq('banned', false);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting all emails:', err);
    return null;
  }
}

async function banEmail(supabase, email) {
  try {
    console.log("Banning email:", email);
    const { data, error } = await supabase
      .from('emails')
      .update({ banned: true })
      .eq('email', email);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating email status:', err);
    return null;
  }
}

async function getUnusedEmails(supabase) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('used', false)
      .eq('banned', false);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting unused emails:', err);
    return null;
  }
}

async function addEmail(supabase, email_address, password, recovery_email, profile_id) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .insert({
        email: email_address,
        password,
        recovery_email,
        profile_id,
        used: false,
        banned: false
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error adding email:', err);
    return null;
  }
}

async function updateEmail(supabase, email, updateData) {
  try {
    const { data, error } = await supabase
      .from('emails')
      .update(updateData)
      .eq('email', email);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating email:', err);
    return false;
  }
}

module.exports = {
  getRandomEmail,
  getEmailByAddress,
  getAllEmails,
  banEmail,
  getUnusedEmails,
  addEmail,
  updateEmail
};
