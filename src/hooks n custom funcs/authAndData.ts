import { message } from 'antd'

/**
 * Authenticates user and fetches data based on the specified mode.
 * This function has three options:
 * 1. Fetch all vacations (mode: 'all')
 * 2. Fetch a single vacation (mode: 'single', requires id)
 * 3. Return user role after successful token authentication (mode: 'none')
 *
 * @param {('none'|'single'|'all')} mode - The operation mode
 * @param {number} [id] - The vacation ID (required for 'single' mode)
 * @returns {Promise<{role: string, vacations: any}>} The user's role and fetched vacations
 */
export const authAndData = async (mode: 'none' | 'single' | 'all', id?: number) => {
  let role: 'user' | 'admin' | undefined = undefined
  let vacations = []

  // Get the access token from local storage
  const accessToken = localStorage.getItem('accessToken');
  let endpoint

  // Determine the appropriate endpoint based on the mode
  if (mode === 'none') {
    endpoint = 'http://localhost:3000/user-role' 
  } else if (mode === 'single') {
    endpoint = `http://localhost:3000/vacations/fetch?id=${id}`
  } else if (mode === 'all') {
    endpoint = 'http://localhost:3000/vacations/fetch'
  }

  // Make the API request
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // Handle response errors
  if (!res.ok) {
    const errorData = await res.json();
    if (res.status === 401) {
      // Handle expired access token
      message.loading('Your access token has expired. Please wait while the system generates a new one...');
      await refreshTokens();
      return authAndData(mode, id); // Retry after refreshing tokens
    } else {
      // Handle other errors
      message.error('Something Went Wrong, Please Login Again!');
      window.location.href = '/login';
      throw new Error(`Error in fetching data: ${errorData || 'unknown error'}`);
    }
  }

  // Process successful response
  const data = await res.json();

  // Update vacations based on the mode
  if (mode === 'all') vacations = data.vacations;
  if (mode === 'single') vacations = data.vacations[0];
  
  // Set the user role
  role = data.role;

  console.log('vacations are', vacations)
  console.log('role is', role)
  return { role, vacations };
};

/**
 * Refreshes authentication tokens
 * Handles various error scenarios during token refresh
 */
const refreshTokens = async () => {
  const res = await fetch('http://localhost:3000/refresh-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    localStorage.clear();
    message.destroy();
    if (res.status === 401) {
      message.error('The Session Has Expired! Please login.');
    } else {
      message.error('An Unknown Error Has Occurred While Refreshing Tokens!');
    }
    window.location.href = '/login';
    throw new Error(`Error in refresh-token request: ${errorData}`);
  }

  // Update tokens in local storage
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  
  // Notify user of successful token refresh
  message.destroy();
  message.success('New Tokens Were Created Successfully! Repeating Original Request...');
};