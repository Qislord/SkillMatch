export function formatSessionRange(
  startDateTime: string | Date,
  endDateTime: string | Date,
) {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${startDateTime} — ${endDateTime}`;
  }

  const sameDay = startDate.toDateString() === endDate.toDateString();

  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedStartDate = dateFormatter.format(startDate);
  const formattedStartTime = timeFormatter.format(startDate);
  const formattedEndDate = dateFormatter.format(endDate);
  const formattedEndTime = timeFormatter.format(endDate);

  if (sameDay) {
    return `${formattedStartDate} ${formattedStartTime}-${formattedEndTime}`;
  }

  return `${formattedStartDate} ${formattedStartTime} – ${formattedEndDate} ${formattedEndTime}`;
}
