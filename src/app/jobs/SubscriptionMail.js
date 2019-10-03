import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

/* Data não inserindo, validar depois */
const formatDate = date =>
  format(parseISO(date), "'dia' dd 'de'  MMMM', às' H:mm'h'", {
    locale: pt,
  });

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { meetup, user } = data;

    await Mail.sendMail({
      to: `${meetup.user.name} <${meetup.user.email}>`,
      subject: `[${meetup.title}] Nova inscrição`,
      template: 'subscription',
      context: {
        organizer: meetup.user.name,
        meetupTitle: meetup.title,
        meetupImage: meetup.path,
        // meetupDate: formatDate(meetup.date),
        userName: user.name,
        userEmail: user.email,
        // userDate: formatDate(new Date()),
      },
    });
  }
}
export default new SubscriptionMail();
