async function getRandomProxy(supabase) {
  try {
    const { data, error } = await supabase.rpc('get_random_proxy');

    console.log(data, error);
    if (error) throw error;
    return data[0]; // The first (and only) item from the results
  } catch (err) {
    console.error('Error getting random proxy:', err);
    return null;
  }
}

async function updateProxy(supabase, proxyId, proxyData) {
  try {
    const { data, error } = await supabase
      .from('proxies')
      .update(proxyData)
      .eq('id', proxyId);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating proxy:', err);
    return null;
  }
}

module.exports = {
  getRandomProxy,
  updateProxy
};
