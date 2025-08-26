async function getUnusedProfile(supabase) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('used', false)
      .eq('banned', false)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting unused profiles:', err);
    return null;
  }
}

async function updateProfile(supabase, profile_id, updateData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('profile_id', profile_id)
      .single();

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating profile:', err);
    return false;
  }
}

module.exports = {
  getUnusedProfile,
  updateProfile
};
