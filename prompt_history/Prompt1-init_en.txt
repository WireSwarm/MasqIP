Developer: #Initialization
## Minimum design
### Color palette
In accordance with Material Design standards:
- Primary
- Primary Variant
- Secondary
- Secondary Variant
- Background
- Surface
- Error
- On Primary
- On Secondary
- On Background
- On Surface
- On Error
For color palette number 1, create a palette with black and purple colors.

### General style guidelines
[Important] You must always follow the style and methods found at https://m3.material.io/
[Important] Use React components, as found at https://reactbits.dev/
Use a light and modern style, since we are building an online tool.
You should use Glassmorphism whenever possible.
Add small animations whenever you see the opportunity.


## Column 1
In this column, you will create a hierarchical IPv4 addressing plan calculator.
For this, use the method described in the requirements document (JLD method).
In this column, there will be an empty field into which you will provide the usable IPv4 range for the calculator.
There will also be a field in which to specify the number of addresses in the first subnet.
Once this number is entered, a new field will appear, automatically focusing the user's cursor inside.
This new field will allow you to specify the number of usable addresses in the second subnet, and so on.
Make sure that every time a new subnet is entered (the number of usable addresses for this subnet),
the result appears automatically without the user having to press calculate.
The result will display as follows: One line per subnet, with the address and the mask of the subnet:
example: Subnet 1: 192.168.1.0/24
Subnet 2: 192.168.2.0/24
Subnet 3: 192.168.3.0/24


## Column 2
In this column, you will create a route summarization tool.
Here, there will be an empty field in which the user specifies the first network to summarize.
When they press Enter, the summarized route will be calculated; a new empty field will be created and the user's cursor will be placed in this field.
The route summary calculation will be based on all filled-in fields. Example:
192.168.1.0/24
192.168.255.0/24
"An empty field is automatically created after the user validates the field above.
Route summary: 192.168.0.0/16

## Column 3
This column corresponds to feature number 3
GOAL: Provide information about user input
Component:
- a field for an IPv4 address, the format will be <ipv4_address>/<CIDR>
- A component containing a set of information about the IP address
In the component with information, you can find:
- a "progressbar", detailed description can be found in the section "Description of the progressbar" in the requirements document file
Other information such as: Network address/mask, number of available IPs, number of used IPs, largest available range, smallest available range, next network, mask in long version, and in wildcard format. -Address type (private/public/cgnat/documentation/multicast, etc.). The IP class also.
To determine which address type the user's input corresponds to, you must use a document-type database. Each IP or IP range has a unique key or type value.