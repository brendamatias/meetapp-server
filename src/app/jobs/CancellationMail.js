import Mail from '../../lib/Mail';

class CancellationMail {
  get key() {
    return 'CancellationMail';
  }

  async handle({ data }) {
    const { meetup, user } = data;

    await Mail.sendMail({
      to: `${user.name} <${user.email}>`,
      subject: `[${meetup.title}] Meetup Cancelado`,
      template: 'cancellation',
      context: {
        userName: user.name,
        meetupTitle: meetup.title,
        organizer: meetup.user.name,
        local: meetup.location,
      },
    });
  }
}
export default new CancellationMail();
