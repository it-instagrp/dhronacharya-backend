export const formatDateTime = (dateTime) => {
  let parsedDate;
  
  // Handle both string and Date objects
  if (dateTime instanceof Date) {
    parsedDate = dateTime;
  } else {
    parsedDate = new Date(dateTime);
  }

  if (!isValid(parsedDate)) {
    console.error('Invalid date passed to formatDateTime:', dateTime);
    return 'Invalid date';
  }

  return format(parsedDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
};