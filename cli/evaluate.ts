export function waitForRescheduleModal(
  modalRescheduleBookingSelector: string,
): Promise<void> {
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (
        (document.querySelector(modalRescheduleBookingSelector) as HTMLElement)
          .innerText === "RESCHEDULE"
      ) {
        clearInterval(intervalId);
        resolve(undefined);
      }
    }, 200);
  });
}

export function getInnerText(node: Element): string {
  return (node as HTMLElement).innerText;
}
