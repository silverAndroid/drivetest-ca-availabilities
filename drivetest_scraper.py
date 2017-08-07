import requests
import argparse
import datetime

session = requests.Session()

def wait():
    input('Press Enter to continue.')

def login():
    email = input('Email:')
    licence_number = input('licence number:')
    licence_expiry = input('licence expiry (YYYY/MM/DD):')
    print('To get the ReCaptcha code required in the next step, go to <link> and follow the instructions given.')
    recaptcha_code = input('ReCaptcha code:')

    login_response = session.post(
        'https://drivetest.ca/booking/v1/driver/email',
        {
            'captchaResponse': recaptcha_code,
            'email': email,
            'emailConfirm': email,
            'licenceExpiry': licence_expiry,
            'licenceNumber': licence_number
        }
    )
    print(login_response.status_code)
    print(login_response.json())

    if login_response.status_code == 401:
        return 'The driver\'s licence information entered does not match DriveTest\'s records. Please try again.'
    if login_response.json()['authenticated']:
        return 'Successfully logged in!'
    else:
        return 'Please verify your email and then try again.'

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('licence_class', help='The licence class you are looking for')
    parser.add_argument('end_date', help='The date of the ending date', type=int)
    parser.add_argument('end_month', help='The month of the ending date', type=int)
    parser.add_argument('end_year', help='The year of the ending date', type=int)
    parser.add_argument('--start_date', help='The date of the starting date (default: current date)', type=int)
    parser.add_argument('--start_month', help='The month of the starting date (default: current month)', type=int)
    parser.add_argument('--start_year', help='The year of the starting date (default: current year)', type=int)
    args = parser.parse_args()

    licence_class = args.licence_class
    end_date = datetime.date(args.end_year, args.end_month, args.end_date)
    start_date = datetime.date.today()
    if args.start_date is not None:
        start_date = start_date.replace(day=args.start_date)
    if args.start_month is not None:
        start_date = start_date.replace(month=args.start_month)
    if args.start_year is not None:
        start_date = start_date.replace(year=args.start_year)

    return (start_date, end_date, licence_class)

(start_date, end_date, licence_class) = parse_args()
while True:
    response = login()
    print(response)
    if response is 'Please verify your email and then try again.':
        exit(1)
    elif response is 'Successfully logged in!':
        break

licence_class_locations = []
# available_dates = []
locations = session.get(
    'https://drivetest.ca/booking/v1/location', json=True).json()['driveTestCentres']

for location in locations:
    if licence_class in location['licenceTestTypes']:
        for service in location['services']:
            if service['licenceClass'] is licence_class:
                licence_class_locations.append((service['serviceId'], location['city']))

for location in licence_class_locations:
    while start_date < end_date:
        booking_dates = session.get(f'https://drivetest.ca/booking/v1/booking/{location[0]}?month={start_date.month}&year={start_date.year}').json()['availableBookingDates']
        available_dates = [(location[1], datetime.date(start_date.year, start_date.month, date['day'])) for date in booking_dates if date['description'] is not 'FULL' or date['description'] is not 'UNAVAILABLE']
        print(available_dates)
        try:
            start_date = start_date.replace(month=start_date.month + 1)
        except ValueError as e:
            start_date = start_date.replace(month=1, year=start_date.year + 1)
