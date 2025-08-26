async function createTask(supabase, messageId, taskType, email, profileId, additionalData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          message_id: messageId,
          output: {},
          email,
          status: 'PENDING',
          task_type: taskType,
          profile_id: profileId,
          additional_data: additionalData,
          created_at: new Date().toISOString()
        })
        .select();
  
      if (error) {
        console.error('Error creating task:', error);
        return { success: false, error };
      }
  
      return { success: true, data };
    } catch (err) {
      console.error('Exception when creating task:', err);
      return { success: false, error: err };
    }
  }
  
  async function getTask(supabase, status = [], notStatus = [], limit = 1, taskTypes = []) {
    try {
      let query = supabase.from('tasks').select('*');
  
      // Apply status filters (OR condition)
      if (status.length === 1) query = query.eq('status', status[0]);
      else if (status.length > 1) query = query.in('status', status);
  
      // Apply notStatus filters
      for (const stat of notStatus) {
        query = query.neq('status', stat);
      }
  
      // Apply taskTypes filters (OR condition)
      if (taskTypes.length === 1) query = query.eq('task_type', taskTypes[0]);
      else if (taskTypes.length > 1) query = query.in('task_type', taskTypes);
  
      query = query.limit(limit);
  
      const { data, error } = await query;
  
      if (error) {
        console.error('Error getting task:', error);
        return { success: false, error };
      }
  
      if (!data || data.length === 0) {
        return { success: false, error: 'No tasks found' };
      }
  
      // Shuffle data
      data.sort(() => Math.random() - 0.5);
  
      return data;
    } catch (err) {
      console.error('Exception when getting task:', err);
      return { success: false, error: err };
    }
  }
  
  async function deleteTask(supabase, id) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
  
      if (error) {
        console.error('Error deleting task:', error);
        return { success: false, error };
      }
  
      return { success: true, data };
    } catch (err) {
      console.error('Exception when deleting task:', err);
      return { success: false, error: err };
    }
  }
  
  async function updateTask(supabase, id, updateData) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
  
      if (error) {
        console.error('Error updating task:', error);
        return { success: false, error };
      }
  
      return { success: true, data };
    } catch (err) {
      console.error('Exception when updating task:', err);
      return { success: false, error: err };
    }
  }
  
  module.exports = {
    createTask,
    getTask,
    deleteTask,
    updateTask
  };
  